(DEV)

  (windows cmd)

  docker build -t blnd-memo-dev .

  docker run -p 5173:5173 -v %cd%:/app -v /app/node_modules blnd-memo-dev