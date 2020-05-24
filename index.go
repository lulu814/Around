package main

import (
	"context"
	"fmt"

	"github.com/olivere/elastic"
)

const (
	USER_INDEX = "user"
	POST_INDEX = "post"
	//do not use localhost: cannot use when DB is separate from the go
	//use external need to change the URL everytime as it changes every time
	ES_URL = "http://10.128.0.2:9200"
)

func main() {
	//create a connection client
	client, err := elastic.NewClient(elastic.SetURL(ES_URL))
	if err != nil {
		// handle error
		panic(err)
	}
	// check if the index exists or not
	// Do is the ral part that execute the previous codes, context.background
	exists, err := client.IndexExists(POST_INDEX).Do(context.Background())
	if err != nil {
		panic(err)
	}
	if !exists {
		// index schema
		mapping := `{
                        "mappings": {
                                "properties": {
                                        "user":     { "type": "keyword", "index": false },
                                        "message":  { "type": "keyword", "index": false },
                                        "location": { "type": "geo_point" },
                                        "url":      { "type": "keyword", "index": false },
                                        "type":     { "type": "keyword", "index": false },
                                        "face":     { "type": "float" }
                                }
                        }
                }`
		_, err := client.CreateIndex(POST_INDEX).Body(mapping).Do(context.Background())
		if err != nil {
			panic(err)
		}
	}

	exists, err = client.IndexExists(USER_INDEX).Do(context.Background())
	if err != nil {
		panic(err)
	}

	if !exists {
		mapping := `{
                        "mappings": {
                                "properties": {
                                        "username": {"type": "keyword"},
                                        "password": {"type": "keyword", "index": false},
                                        "age":      {"type": "long", "index": false},
                                        "gender":   {"type": "keyword", "index": false}
                                }
                        }
                }`
		_, err = client.CreateIndex(USER_INDEX).Body(mapping).Do(context.Background())
		if err != nil {
			panic(err)
		}
	}

	fmt.Println("Post index is created.")
}
