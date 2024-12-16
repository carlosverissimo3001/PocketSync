# SDLE Second Assignment

SDLE Second Assignment of group T2-G16.

## Group members:

| #   | Name             | Email                                         |
| --- | ---------------- | --------------------------------------------- |
| 1.  | Carlos Veríssimo | [up201907716@up.pt](mailto:up202008867@up.pt) |
| 2.  | João Felix       | [up202008867@up.pt](mailto:up202008867@up.pt) |
| 3.  | José Costa       | [up202004823@up.pt](mailto:up202008867@up.pt) |

## Folder Structure

- [`src`](./src) - The source code
  - [`api`](./src/api) - The API server
  - [`app`](./src/app) - The web app
  - [`bridge`](./src/bridge) - The bridge server
- [`doc`](./doc) - Documentation: includes the slides used in the presentation and the initial requirements

## Pre-requisites

- Please make sure you have npm installed. Visit [nodejs.org](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to download and install it.

> :warning: Please refer to [this folder](https://drive.google.com/drive/folders/1VoiujRZF0um9QeXkzaruPY6qaiNhCme6?usp=drive_link) to acess the environment variables. Use your institution email(`g.uporto.pt`) to access the folder.
> You will find two `.env` files, one for the API and one for the app. They should be in the root of the respective folder (e.g. `src/api/.env` and `src/app/.env`).

## Resources

- The Slides used in the presentation are in the [doc](./doc) folder
- The [Demo](https://www.loom.com/share/5242996b3ba8420791ff370f23848571?sid=21234c40-32ed-4b61-8570-5994f43dfa86) video
- A [video](https://www.loom.com/share/dea65df9a8e44719a003c156038c9d5f?sid=b8c651d2-741c-452c-a928-ea3d4182379f) denoting the use cases

## Run the Backend

1. Move into the `api` folder

```sh
cd api
```

2. Install dependencies, globally

```sh
npm install -g yarn
```

1. Ensure `.env` is set up correctly
   > should have `DATABASE_URL` set
2. Install dependencies

```sh
yarn
```
<!--
5. Apply prisma migrations and generate the Prisma client

```sh
yarn prisma migrate dev
yarn prisma generate
```
-->

5. Apply prisma shards migrations and generate the shards Prisma client (script for windows shell)

```sh
.\migrate_shards.ps1
```

> For linux, you can try running `migrate_shards.sh`. This has not been tested yet, so please report any issues.

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

- In order to use ZeroMQ to its full extent, we establish a PUB/SUB relationship between the API and a server, that we call "the Bridge".
- Then, using Socket.IO, the bridge will forward the messages to the web app.


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

## User Credentials

- test_user
- E3%hjEzN@WULHM
<!-- when hashed -> $2a$10$vtRM/PazBJuy9T1rws.sy.6gg8uXLvro1QSL8tulWon8.Da5Ad/.W -->

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
