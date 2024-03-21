import { serial, integer, text, boolean, pgTable, varchar, pgEnum } from "drizzle-orm/pg-core";



export const products = pgTable("product", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    price: integer("price").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    image: text("image").notNull(),
    // rating: integer("rating")
})