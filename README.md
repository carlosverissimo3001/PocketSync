# Local First Shopping List

## Folder Structure

- [`api`](./api) - The API server
- [`app`](./app) - The web app
- [`docs`](./docs) - Documentation

## Requirements

- yarn
- docker
- pm2 (optional)

## Initial Setup

1. Clone the project

> git clone <ADD_LINK_HERE>

2. Install dependencies, globally

> npm install -g yarn pm2

3. Ensure `prisma/.env` is set up correctly

> should have `DATABASE_URL` set

## Running the project

1. Install dependencies

> yarn install

2. Generate Prisma client and apply migrations

> yarn prisma generate
> yarn prisma migrate dev



## Prisma 

Prisma is used to interact with the database.

### Changing the Prisma schema

1. Make changes to `prisma/schema.prisma`
2. Run `yarn prisma generate` to update the Prisma client

> Run with `--name <name>` to name your migration, otherwise you will be prompted to name it after

3. Run `yarn prisma migrate dev` to update the **database**

### Viewing the database

1. Run `yarn prisma studio` to view the database in the browser

### Inserting data

1. Run `yarn prisma migrate dev --create-only` to create an empty migration

*Note that it does not apply the migration to the database, it just generates the SQL file*

1. Write the SQL to insert the data you want into the `.sql` file in the `prisma/migrations` folder
2. Apply the migration to the database by running `yarn prisma migrate dev`

> It will prompt you to give the migration a name, if you haven't changed the name from the default, just press enter to accept it