# SDLE Second Assignment

SDLE Second Assignment of group T&lt;m&gt;&lt;n&gt;G&lt;p&gt;&lt;q&gt;.

## Group members:

| #   | Name             | Email                                         |
| --- | ---------------- | --------------------------------------------- |
| 1.  | Carlos Veríssimo | [up201907716@up.pt](mailto:up202008867@up.pt) |
| 2.  | João Felix       | [up202008867@up.pt](mailto:up202008867@up.pt) |
| 3.  | José Costa       | [up202004823@up.pt](mailto:up202008867@up.pt) |

## Folder Structure

- [`api`](./api) - The API server
- [`app`](./app) - The web app
- [`docs`](./docs) - Documentation
- [`bridge`](./bridge)
  - In other to use ZeroMQ to its full extent, we establish a PUB/SUB relationship between the API and a server, we call "the Bridge".
  - Then, using Socket.IO, the bridge will forward the messages to the web app.


## Run the Backend

1. Move into the `api` folder

```sh
cd api
```

2. Install dependencies, globally

```sh
npm install -g yarn
```

3. Ensure `prisma/.env` is set up correctly
   > should have `DATABASE_URL` set
4. Install dependencies

```sh
yarn
```

5. Apply prisma migrations and generate the Prisma client

```sh
yarn prisma migrate dev
yarn prisma generate
```

6. Start the server

```sh
npm run start:dev
```

## Run the Frontend

1. Move into the `app` folder

```sh
cd app # assuming you are in the root folder
```

2. Install dependencies

```sh
npm install
```

3. Start the development server

```sh
npm run dev
```

## Run the Bridge

1. Move into the `bridge` folder

```sh
cd bridge
```

2. Install dependencies

```sh
npm install
```

3. Start the bridge

```sh
npm start
```

## Prisma

Prisma is the ORM used to interact with the database.

The [schema](./api/prisma/schema.prisma) is the source of truth for the database. When you modify the schema, you need to generate the Prisma client to reflect the changes (it will create an `.sql` file in the `**prisma**/migrations` folder).

### Changing the Prisma schema

1. Make changes to `prisma/schema.prisma`
2. Run `yarn prisma generate` to update the Prisma client

> Run with `--name <name>` to name your migration, otherwise you will be prompted to name it after

3. Run `yarn prisma migrate dev` to update the **database**

### Viewing the database

1. Run `yarn prisma studio` to view the database in the browser

### Inserting data

1. Run `yarn prisma migrate dev --create-only` to create an empty migration

_Note that it does not apply the migration to the database, it just generates the SQL file_

1. Write the SQL to insert the data you want into the `.sql` file in the `prisma/migrations` folder
2. Apply the migration to the database by running `yarn prisma migrate dev`

> It will prompt you to give the migration a name, if you haven't changed the name from the default, just press enter to accept it
