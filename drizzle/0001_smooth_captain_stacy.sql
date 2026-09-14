CREATE TABLE "pt_bid_commitments" (
	"workspace_hash" varchar(64) NOT NULL,
	"tender_id" varchar(64) NOT NULL,
	"id" varchar(64) NOT NULL,
	"commitment" varchar(64) NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pt_bid_commitments_workspace_hash_id_pk" PRIMARY KEY("workspace_hash","id"),
	CONSTRAINT "pt_bid_commitments_value" UNIQUE("workspace_hash","tender_id","commitment"),
	CONSTRAINT "pt_bid_commitments_hex" CHECK ("pt_bid_commitments"."commitment" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "pt_bid_commitments" ADD CONSTRAINT "pt_bid_commitments_workspace_hash_pt_workspaces_token_hash_fk" FOREIGN KEY ("workspace_hash") REFERENCES "public"."pt_workspaces"("token_hash") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_bid_commitments" ADD CONSTRAINT "pt_bid_commitments_workspace_hash_tender_id_pt_tenders_workspace_hash_id_fk" FOREIGN KEY ("workspace_hash","tender_id") REFERENCES "public"."pt_tenders"("workspace_hash","id") ON DELETE cascade ON UPDATE no action;