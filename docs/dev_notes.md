### Dev Scripts
Currently there are two different dev scripts that can be ran from the root of the project:
```
npm run install
```
which installs the necessary packages for each component of the application
```
npm run start
```
which starts the test psql server and the frontend and service components.

Note that the docker daemon must be running for this to work

### Linting
To enforce proper code formatting, your code must pass linting before it can be ran.

Do not fret! most linting errors can be fixed with
```
eslint --fix
```

### Lobby
See [lobby setup and API notes](./lobby.md) for the static lobby's anonymous
player sessions, team capacity, and database setup.
