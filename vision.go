package main

import (
	"context"
	"fmt"
	// import library as name
	vision "cloud.google.com/go/vision/apiv1"
)

// Annotate an image file based on Cloud Vision API, return score and error if exists.
// uri: file address
func annotate(uri string) (float32, error) {
	// Creates a client
	ctx := context.Background()
	client, err := vision.NewImageAnnotatorClient(ctx)
	if err != nil {
		return 0.0, err
	}
	// GCS 没建议close, vision有
	defer client.Close()
	// will not return error from the NewImageFromURI
	image := vision.NewImageFromURI(uri)
	// face detection, detect if there is a face or not
	annotations, err := client.DetectFaces(ctx, image, nil, 1)
	if err != nil {
		return 0.0, err
	}
	// check if there is face or not
	if len(annotations) == 0 {
		fmt.Println("No faces found.")
		return 0.0, nil
	}
	return annotations[0].DetectionConfidence, nil
}
