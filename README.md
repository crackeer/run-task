# docker build

docker build --platform linux/amd64 -t web-tool-backend .


# docker-compose.yml

```yml
version: '1'
services:
  app:
    container_name: web-tool
    image: web-tool:latest
    restart: always
    environment:
    - SQLITE_DB=/app/sqlite/web-tool.db
    ports:
    - "9174:8080"
    volumes:
    - /usr/local/docker/web-tool/sqlite/:/app/sqlite/
```