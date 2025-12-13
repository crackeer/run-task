# docker build

docker build --platform linux/amd64 -t run-task .


# docker-compose.yml

```yml
version: '1'
services:
  app:
    container_name: run-task
    image: run-task:latest
    restart: always
    environment:
    - SQLITE_DB=/app/sqlite/run-task.db
    ports:
    - "7000:8080"
    volumes:
    - /usr/local/docker/run-task/sqlite/:/app/sqlite/
```