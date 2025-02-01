CREATE TABLE IF NOT EXISTS "hackmate_hackathon_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"devpost_url" text NOT NULL,
	"thumbnail_url" text,
	"technologies" json,
	"winners" json,
	"team_size" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "example";