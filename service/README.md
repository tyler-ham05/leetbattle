# service

Node.js microservice architecture template. Each microservice is a fully standalone
Node.js/TypeScript/Express project with its own `package.json` and `node_modules`

## Layout

```
service/
  CodeValidationService/   # code validation service, port 4001
  AuthService/              # auth service, port 4002
```

## Running a service

```bash
cd CodeValidationService   # or AuthService
npm install
npm run dev   # hot reload
```

## Running PSQL Server with Docker
If you want to run a Docker PSQL server to test the application with, you can use

```bash
cd service
docker compose up 
```

note that other services will have to manually add their own sql files to the docker-compose. 
Ex.
```
volumes:
      - ./CodeService/sql/databases.sql:/docker-entrypoint-initdb.d/01-databases.sql
      - ./CodeService/sql/schema.sql:/docker-entrypoint-initdb.d/02-code-service-schema.sql
      - ./CodeService/sql/data.sql:/docker-entrypoint-initdb.d/03-code-service-data.sql
      - ./NewService/sql/databases.sql:/docker-entrypoint-initdb.d/04-databases.sql
      - ./NewService/sql/schema.sql:/docker-entrypoint-initdb.d/05-new-service-schema.sql
      - ./NewService/sql/data.sql:/docker-entrypoint-initdb.d/06-new-service-data.sql
```
If you make any changes to the sample data or create a new table, you will need to refresh the volume. Run
```
docker compose down -v
docker compose up
```


## Adding a new microservice

1. Copy an existing service folder (e.g. `CodeValidationService`) to a new name.
2. Update `name` in its `package.json` and its `PORT`. Also update port within Dockerfile
3. Run `npm install` inside the new folder (it has its own `node_modules`).
4. Update the service-wide `docker-compose.yml` with any new data tables
5. Include the new build command within the project-wide `package.json` (or ask claude to do it, i dont really care)