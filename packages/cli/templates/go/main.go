package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"
)

func write(w http.ResponseWriter, v any) {
	w.Header().Set("content-type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func auth(r *http.Request) bool {
	expected := os.Getenv("PROVIDER_API_KEY")
	if expected == "" {
		return true
	}
	return r.Header.Get("x-provider-api-key") == expected
}

var sampleOffering = map[string]any{
	"id":           "service-1",
	"providerId":   "my-provider",
	"offeringCode": "service-1",
	"title":        "Example service",
	"categorySlug": "services",
	"basePrice":    10000,
	"currency":     "UZS",
	"isAvailable":  true,
}

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		write(w, map[string]any{
			"status":    "HEALTHY",
			"latencyMs": 1,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	http.HandleFunc("/provider-info", func(w http.ResponseWriter, r *http.Request) {
		if !auth(r) {
			http.Error(w, `{"message":"Unauthorized"}`, 401)
			return
		}
		write(w, map[string]any{
			"id":           "my-provider",
			"slug":         "my-provider",
			"name":         "My Provider",
			"status":       "DRAFT",
			"type":         "SERVICES",
			"category":     "services",
			"geography":    []string{"UZ"},
			"adapterType":  "remote-http",
			"authMethod":   "API_KEY",
			"capabilities": []string{"METADATA", "HEALTH", "CATALOG"},
		})
	})

	http.HandleFunc("/catalog", func(w http.ResponseWriter, r *http.Request) {
		if !auth(r) {
			http.Error(w, `{"message":"Unauthorized"}`, 401)
			return
		}
		write(w, map[string]any{
			"providerSlug": "my-provider",
			"categories": []any{
				map[string]any{"id": "services", "slug": "services", "title": "Services", "displayOrder": 0},
			},
			"offerings": []any{sampleOffering},
		})
	})

	http.HandleFunc("/offerings/", func(w http.ResponseWriter, r *http.Request) {
		if !auth(r) {
			http.Error(w, `{"message":"Unauthorized"}`, 401)
			return
		}
		id := strings.TrimPrefix(r.URL.Path, "/offerings/")
		if id == "service-1" {
			write(w, sampleOffering)
			return
		}
		http.Error(w, `{"message":"Offering not found."}`, 404)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	http.ListenAndServe(":"+port, nil)
}
