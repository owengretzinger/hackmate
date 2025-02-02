CREATE TABLE IF NOT EXISTS "hackmate_user_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"github_url" text NOT NULL,
	"readme" text,
	"architecture_diagram" text,
	"pitch_draft" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ALTER COLUMN "technologies" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ALTER COLUMN "technologies" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "awards" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "demo_video" json;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "gallery_images" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "team_members" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "engagement" json DEFAULT '{"likes":0,"comments":0}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "hackathon_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD COLUMN "hackathon_name" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hackmate_user_projects" ADD CONSTRAINT "hackmate_user_projects_user_id_hackmate_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hackmate_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" DROP COLUMN IF EXISTS "winners";--> statement-breakpoint
ALTER TABLE "hackmate_hackathon_projects" ADD CONSTRAINT "hackmate_hackathon_projects_devpost_url_unique" UNIQUE("devpost_url");