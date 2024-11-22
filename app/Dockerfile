FROM node:18-alpine

WORKDIR /app

# Copy the package files first, then install dependencies
COPY package.json /app
COPY package-lock.json /app
RUN npm install

# Copy the rest of the application files
COPY . /app

EXPOSE 5173  

CMD ["npm", "run", "dev"]
