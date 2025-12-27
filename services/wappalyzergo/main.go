package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	wappalyzer "github.com/projectdiscovery/wappalyzergo"
)

type Tech struct {
	Name    string   `json:"name"`
	Version string   `json:"version,omitempty"`
	Tags    []string `json:"tags,omitempty"`
}

type AnalyzeResponse struct {
	Technologies []Tech `json:"technologies"`
	Provider     string `json:"provider"`
	URL          string `json:"url"`
}

const defaultBodyLimit = 2 * 1024 * 1024
const defaultTimeoutSeconds = 12

func main() {
	client, err := wappalyzer.New()
	if err != nil {
		log.Fatalf("failed to init wappalyzer: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/analyze", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		url := strings.TrimSpace(r.URL.Query().Get("url"))
		if url == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing url"})
			return
		}
		if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
			url = "https://" + url
		}

		response, err := fetch(url)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}
		defer func() {
			if cerr := response.Body.Close(); cerr != nil {
				log.Printf("error closing response body: %v", cerr)
			}
		}()

		bodyLimit := getEnvInt("MAX_BODY_BYTES", defaultBodyLimit)
		body, err := io.ReadAll(io.LimitReader(response.Body, int64(bodyLimit)))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}

		fingerprints := client.Fingerprint(response.Header, body)
		techs := make([]Tech, 0, len(fingerprints))
		for key := range fingerprints {
			name, version := splitNameVersion(key)
			techs = append(techs, Tech{Name: name, Version: version})
		}
		sort.Slice(techs, func(i, j int) bool { return techs[i].Name < techs[j].Name })

		payload := AnalyzeResponse{
			Technologies: techs,
			Provider:     "wappalyzergo",
			URL:          url,
		}
		writeJSON(w, http.StatusOK, payload)
		log.Printf("analyzed %s in %s", url, time.Since(start).String())
	})

	addr := ":8080"
	log.Printf("wappalyzergo listening on %s", addr)
	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Fatal(server.ListenAndServe())
}

func fetch(url string) (*http.Response, error) {
	timeoutSeconds := getEnvInt("REQUEST_TIMEOUT_SECONDS", defaultTimeoutSeconds)
	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("User-Agent", "web-check-wappalyzergo/1.0")
	request.Header.Set("Accept", "text/html,application/xhtml+xml")
	return client.Do(request)
}

func splitNameVersion(raw string) (string, string) {
	idx := strings.LastIndex(raw, ":")
	if idx <= 0 || idx >= len(raw)-1 {
		return raw, ""
	}
	version := raw[idx+1:]
	if !strings.ContainsAny(version, "0123456789") {
		return raw, ""
	}
	return raw[:idx], version
}

func getEnvInt(key string, fallback int) int {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	num, err := strconv.Atoi(val)
	if err != nil {
		return fallback
	}
	return num
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(payload)
}
