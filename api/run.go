package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
)

func abortSSEMessage(ctx *gin.Context, msg string) {
	ctx.Header("Content-Type", "text/event-stream")
	ctx.Header("Cache-Control", "no-cache")
	ctx.Header("Connection", "keep-alive")
	ctx.Header("Transfer-Encoding", "chunked")
	ctx.SSEvent("message", msg)
	ctx.Writer.Flush()
	ctx.SSEvent("close", "Task aborted")
	ctx.Writer.Flush()
}

// RunTaskSSE 处理SSE请求
func RunTaskSSE(ctx *gin.Context) {

	taskID := ctx.Query("task_id")
	task := container.GetTask(taskID)
	if task == nil {
		abortSSEMessage(ctx, fmt.Sprintf("task with id %s not found", taskID))
		return
	}

	if len(task.RunEndpoint) < 1 {
		abortSSEMessage(ctx, fmt.Sprintf("task with id %s has no run endpoint", taskID))
		return
	}

	if len(task.InputEndpoint) > 0 {
		restyClient := resty.New()
		resp, err := restyClient.R().
			SetHeader("Content-Type", "application/json").
			SetBody(task.Input).
			Post(task.InputEndpoint)
		if err != nil {
			abortSSEMessage(ctx, fmt.Sprintf("failed to call input endpoint: %v", err))
			return
		}
		task.Input = resp.String()
	}
	query := map[string]interface{}{}
	if len(task.Input) > 0 {
		if err := json.Unmarshal([]byte(task.Input), &query); err != nil {
			abortSSEMessage(ctx, fmt.Sprintf("failed to unmarshal input: %v", err))
			return
		}
	}
	params := convertMap(query)
	endpoint, err := url.Parse(task.RunEndpoint)
	if err != nil {
		abortSSEMessage(ctx, fmt.Sprintf("failed to parse run endpoint: %v", err))
		return
	}

	proxy := &httputil.ReverseProxy{Rewrite: func(req *httputil.ProxyRequest) {
		req.SetURL(endpoint)
		req.Out.Header.Set("Host", endpoint.Host)
		fmt.Printf("req.In.URL: %v\n", req.In.URL)
		req.Out.Header.Set("User-Agent", req.In.Header.Get("User-Agent"))
		req.Out.URL.Host = endpoint.Host
		req.Out.URL.Path = endpoint.Path
		req.Out.URL.Scheme = endpoint.Scheme
		req.Out.Method = http.MethodGet
		req.Out.URL.RawQuery = toRawQuery(params)
		req.Out.Body = nil
	}, ErrorLog: log.New(os.Stderr, "ReverseProxy: ", log.LstdFlags)}
	proxy.ServeHTTP(ctx.Writer, ctx.Request)

}

func toRawQuery(input map[string]string) string {
	query := url.Values{}
	for k, v := range input {
		query.Add(k, v)
	}
	return query.Encode()
}

func convertMap(input map[string]interface{}) map[string]string {
	output := map[string]string{}
	for k, v := range input {
		if str, ok := v.(string); ok {
			output[k] = str
		} else {
			bytes, err := json.Marshal(v)
			if err != nil {
				continue
			}
			output[k] = string(bytes)
		}
	}
	return output
}
