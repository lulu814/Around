package main

import (
	"cloud.google.com/go/storage"
	"context"
	"encoding/json"
	"fmt"
	jwtmiddleware "github.com/auth0/go-jwt-middleware"
	jwt "github.com/dgrijalva/jwt-go"
	"github.com/gorilla/mux" //can add extra restrictions to the handler mapping
	"github.com/olivere/elastic"
	"github.com/pborman/uuid"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"reflect"
	"strconv"
)

const (
	POST_INDEX = "post"
	DISTANCE   = "200km"

	ES_URL      = "http://10.128.0.2:9200"
	BUCKET_NAME = "around2020-bucket"
)

var (
	mediaTypes = map[string]string{
		".jpeg": "image",
		".jpg":  "image",
		".gif":  "image",
		".png":  "image",
		".mov":  "video",
		".mp4":  "video",
		".avi":  "video",
		".flv":  "video",
		".wmv":  "video",
	}
)

type Location struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type Post struct {
	// `json:"user"` is for the json parsing of this User field. Otherwise, by default it's 'User'.
	User     string   `json:"user"`
	Message  string   `json:"message"`
	Location Location `json:"location"`
	Url      string   `json:"url"`
	Type     string   `json:"type"`
	Face     float32  `json:"face"`
}

func main() {
	fmt.Println("started-service")

	//use the same signingmethod and signing key to decode
	jwtMiddleware := jwtmiddleware.New(jwtmiddleware.Options{
		ValidationKeyGetter: func(token *jwt.Token) (interface{}, error) {
			return []byte(mySigningKey), nil
		},
		SigningMethod: jwt.SigningMethodHS256,
	})

	r := mux.NewRouter()

	r.Handle("/post", jwtMiddleware.Handler(http.HandlerFunc(handlerPost))).Methods("POST", "OPTIONS")
	r.Handle("/search", jwtMiddleware.Handler(http.HandlerFunc(handlerSearch))).Methods("GET", "OPTIONS")
	r.Handle("/cluster", jwtMiddleware.Handler(http.HandlerFunc(handlerCluster))).Methods("GET", "OPTIONS")
	r.Handle("/signup", http.HandlerFunc(handlerSignup)).Methods("POST", "OPTIONS")
	r.Handle("/login", http.HandlerFunc(handlerLogin)).Methods("POST", "OPTIONS")

	log.Fatal(http.ListenAndServe(":8080", r))

	//http.HandleFunc("/post", handlerPost)
	//http.HandleFunc("/search", handlerSearch)
	//http.HandleFunc("/cluster", handlerCluster)
	//log.Fatal(http.ListenAndServe(":8080", nil))
}

func handlerPost(w http.ResponseWriter, r *http.Request) {
	// Parse from body of request to get a json object.
	fmt.Println("Received one post request")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")

	if r.Method == "OPTIONS" {
		return
	}

	user := r.Context().Value("user")
	claims := user.(*jwt.Token).Claims
	username := claims.(jwt.MapClaims)["username"]

	// step 2: save post to elasticsearch/gcs

	// step 1: get paramenters from request
	// data is inside the request  body: form data not JSON
	lat, _ := strconv.ParseFloat(r.FormValue("lat"), 64)
	lon, _ := strconv.ParseFloat(r.FormValue("lon"), 64)

	p := &Post{
		User:    username.(string),
		Message: r.FormValue("message"),
		Location: Location{
			Lat: lat,
			Lon: lon,
		},
		Face: 0.0,
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Image is not available", http.StatusBadRequest)
		fmt.Printf("Image is not available %v\n", err)
		return
	}

	suffix := filepath.Ext(header.Filename)
	if t, ok := mediaTypes[suffix]; ok {
		p.Type = t
	} else {
		p.Type = "unknown"
	}
	// uuid guarantee to create unique id
	id := uuid.New()
	attrs, err := saveToGCS(file, id)
	if err != nil {
		http.Error(w, "Failed to save image to GCS", http.StatusInternalServerError)
		fmt.Printf("Failed to save image to GCS %v\n", err)
		return
	}
	p.Url = attrs.MediaLink
	// add annotation results to the p
	// the file is in GCS: URI --> "gs://bucketname/filename", we use id of the file instead of name
	if p.Type == "image" {
		// Sprintf 只复制不打印，标准化输出
		uri := fmt.Sprintf("gs://%s/%s", BUCKET_NAME, id)
		if score, err := annotate(uri); err != nil {
			http.Error(w, "Failed to annotate the image", http.StatusInternalServerError)
			fmt.Printf("Failed to annotate the image %v\n", err)
			return
		} else {
			p.Face = score
		}
	}

	err = saveToES(p, POST_INDEX, id)
	if err != nil {
		http.Error(w, "Failed to save post to Elasticsearch", http.StatusInternalServerError)
		fmt.Printf("Failed to save post to Elasticsearch %v\n", err)
		return
	}

}

func handlerSearch(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Received one request for search")
	// add response header JSON format
	w.Header().Set("Content-Type", "application/json")

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")

	if r.Method == "OPTIONS" {
		return
	}

	// Step 1: get the parameter from request
	// Step 2: search posts from elasticSearch
	// Step 3: return post in response body (post -> JSON -> add in response)

	// r.URL.Query(）get the query part in URL (key:val pair)
	// strconv: convert string to float;  parse to 64bit float
	lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lon, _ := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	// range is optional
	ran := DISTANCE
	// 搜索半径
	if val := r.URL.Query().Get("range"); val != "" {
		ran = val + "km"
	}
	fmt.Println("range is ", ran)

	// Search posts from elasticsearch
	query := elastic.NewGeoDistanceQuery("location")
	query = query.Distance(ran).Lat(lat).Lon(lon)
	searchResult, err := readFromES(query, POST_INDEX)
	if err != nil {
		//prevent the elastic search machine shut down because of eror
		http.Error(w, "Failed to read post from Elasticsearch", http.StatusInternalServerError)
		fmt.Printf("Failed to read post from Elasticsearch %v.\n", err)
		return
	}

	posts := getPostFromSearchResult(searchResult)
	// convert post to JSON
	js, err := json.Marshal(posts)
	if err != nil {
		http.Error(w, "Failed to parse posts into JSON format", http.StatusInternalServerError)
		fmt.Printf("Failed to parse posts into JSON format %v.\n", err)
		return
	}
	w.Write(js)
}

// http.ResponseWriter is an interface, http.Request is a truct
func handlerCluster(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Received one cluster request")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")

	if r.Method == "OPTIONS" {
		return
	}

	// http://localhost:8080/cluster?term=face, easier to expand functionalities to have term instead of face
	term := r.URL.Query().Get("term")
	query := elastic.NewRangeQuery(term).Gte(0.9)

	searchResult, err := readFromES(query, POST_INDEX)
	if err != nil {
		http.Error(w, "Failed to read from Elasticsearch", http.StatusInternalServerError)
		return
	}

	posts := getPostFromSearchResult(searchResult)
	js, err := json.Marshal(posts)
	if err != nil {
		http.Error(w, "Failed to parse post object", http.StatusInternalServerError)
		fmt.Printf("Failed to parse post object %v\n", err)
		return
	}
	w.Write(js)
}

// * return a reference
func readFromES(query elastic.Query, index string) (*elastic.SearchResult, error) {
	client, err := elastic.NewClient(elastic.SetURL(ES_URL))
	if err != nil {
		return nil, err
	}

	searchResult, err := client.Search().
		Index(index).            // seach in table called index
		Query(query).            // specify the query
		Pretty(true).            // pretty print request and response JSON
		Do(context.Background()) // execute, context provides environment, but background would give default

	if err != nil {
		return nil, err
	}

	return searchResult, nil
}

func getPostFromSearchResult(searchResult *elastic.SearchResult) []Post {
	var ptype Post
	var posts []Post
	// relect.TypeOf --> filter searchResult to get only the data in ptype
	for _, item := range searchResult.Each(reflect.TypeOf(ptype)) {
		if p, ok := item.(Post); ok {
			posts = append(posts, p)
		}
	}
	return posts
}

// r: file that need to be uploaded, objectname, objectAttrs: return the path or other info to ES
func saveToGCS(r io.Reader, objectName string) (*storage.ObjectAttrs, error) {
	ctx := context.Background()

	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}

	bucket := client.Bucket(BUCKET_NAME)
	if _, err := bucket.Attrs(ctx); err != nil {
		return nil, err
	}
	// use outside API need to use context
	object := bucket.Object(objectName)
	wc := object.NewWriter(ctx)
	// copy file r into wc
	if _, err := io.Copy(wc, r); err != nil {
		return nil, err
	}

	if err := wc.Close(); err != nil {
		return nil, err
	}

	// access control list, 权限是RoleRead can only read, 向所有人allusers open read
	// default: owner
	if err := object.ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
		return nil, err
	}

	attrs, err := object.Attrs(ctx)
	if err != nil {
		return nil, err
	}

	fmt.Printf("Image is saved to GCS: %s\n", attrs.MediaLink)
	return attrs, nil
}

func saveToES(i interface{}, index string, id string) error {
	client, err := elastic.NewClient(elastic.SetURL(ES_URL))
	if err != nil {
		return err
	}

	_, err = client.Index().
		Index(index).
		Id(id).
		BodyJson(i).
		Do(context.Background())

	if err != nil {
		return err
	}

	return nil
}
