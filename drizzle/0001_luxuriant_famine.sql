CREATE TABLE `extraction_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` varchar(50) NOT NULL,
	`document_id` int NOT NULL,
	`entities_extracted` int DEFAULT 0,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extraction_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`id_source` varchar(255) NOT NULL,
	`source` varchar(100) NOT NULL,
	`date_decision` varchar(10),
	`juridiction` varchar(255),
	`type_document` varchar(100),
	`texte_brut` text,
	`url_source` varchar(500),
	`date_collecte` timestamp NOT NULL DEFAULT (now()),
	`niveau_confiance_extraction` int,
	`necessite_verification_humaine` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `legal_documents_id_source_unique` UNIQUE(`id_source`)
);
--> statement-breakpoint
CREATE TABLE `legal_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`id_decision` varchar(255) NOT NULL,
	`source_id` varchar(255) NOT NULL,
	`type_litige` varchar(100) NOT NULL,
	`secteur` varchar(100),
	`juridiction` varchar(255),
	`date_decision` varchar(10),
	`sens_verdict` varchar(50) NOT NULL,
	`montant_alloue` int,
	`intervenants` text,
	`references_legales` text,
	`niveau_confiance` int,
	`resume_automatique` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `legal_entities_id_decision_unique` UNIQUE(`id_decision`)
);
--> statement-breakpoint
CREATE TABLE `scraping_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` varchar(50) NOT NULL,
	`source` varchar(100) NOT NULL,
	`documents_collected` int DEFAULT 0,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scraping_jobs_id` PRIMARY KEY(`id`)
);
