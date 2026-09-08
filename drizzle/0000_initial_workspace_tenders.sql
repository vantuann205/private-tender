CREATE TABLE "pt_tenders" (
	"workspace_hash" varchar(64) NOT NULL,
	"id" varchar(64) NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"requirements" text[] NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"winner_rule" varchar(80) NOT NULL,
	"status" varchar(10) NOT NULL,
	"organization" varchar(120) NOT NULL,
	"category" varchar(80) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pt_tenders_workspace_hash_id_pk" PRIMARY KEY("workspace_hash","id"),
	CONSTRAINT "pt_tenders_status" CHECK ("pt_tenders"."status" IN ('Draft', 'Open', 'Closed')),
	CONSTRAINT "pt_tenders_title" CHECK (length(trim("pt_tenders"."title")) BETWEEN 1 AND 120),
	CONSTRAINT "pt_tenders_description" CHECK (length(trim("pt_tenders"."description")) BETWEEN 1 AND 3000),
	CONSTRAINT "pt_tenders_requirements" CHECK (cardinality("pt_tenders"."requirements") BETWEEN 1 AND 1500 AND length(array_to_string("pt_tenders"."requirements", E'
')) <= 3000),
	CONSTRAINT "pt_tenders_winner_rule" CHECK ("pt_tenders"."winner_rule" IN ('Lowest eligible bid', 'Manual review (future)'))
);
--> statement-breakpoint
CREATE TABLE "pt_workspaces" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pt_tenders" ADD CONSTRAINT "pt_tenders_workspace_hash_pt_workspaces_token_hash_fk" FOREIGN KEY ("workspace_hash") REFERENCES "public"."pt_workspaces"("token_hash") ON DELETE cascade ON UPDATE no action;