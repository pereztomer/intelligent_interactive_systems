# Docker Deployment Instructions

## Running the Application

### 1. Pull the Image from Docker Hub
```bash
docker pull tomerperetz1234/intelligent-systems:latest
```

### 2. Run the Container
```bash
docker run -p 5000:5000 tomerperetz1234/intelligent-systems:latest
```

### 3. Access the Application
Open your browser and navigate to:
```
http://localhost:5000
```

---

## Building and Pushing (For Maintainers)

If you need to build and push a new version of the image:

### Build the Image
```bash
docker build -t tomerperetz1234/intelligent-systems:latest .
```

### Push to Docker Hub
```bash
docker push tomerperetz1234/intelligent-systems:latest
```
