# running baackend
``` bash
docker build -t laravel-app .\cd-server
docker run -p 8000:8000 -v ${PWD}\cd-server:/app laravel-app
```

Note: For development, ensure your `.env` file has `DB_CONNECTION=sqlite` to avoid needing a separate database service. If you prefer MariaDB, run a local MariaDB instance or use Docker Compose for the full stack.

### running frontend
```bash
docker build -t vue-app .\client
docker run -p 5173:5173 -v ${PWD}\client:/app vue-app
```


- Backend: http://localhost:8000
- Frontend: http://localhost:5173

# Running in Production
```bash
docker-compose up --build
```
