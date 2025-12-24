FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/wappalyzergo .

FROM alpine:3.23.2
RUN adduser -D -u 10001 wappalyzer
USER wappalyzer
COPY --from=build /bin/wappalyzergo /bin/wappalyzergo
EXPOSE 8080
ENV REQUEST_TIMEOUT_SECONDS=12
ENV MAX_BODY_BYTES=2097152
ENTRYPOINT ["/bin/wappalyzergo"]
