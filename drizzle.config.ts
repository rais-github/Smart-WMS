export default {
  dialect: "postgresql",
  schema: "./src/utils/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    connectionString: process.env.DATABASE_URL,
  },
};
