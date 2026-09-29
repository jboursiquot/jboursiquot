# AWS work for this personal site uses a personal profile only. Never a Skilltype one.
AWS_PROFILE ?= personal
STACK ?= jboursiquot-site
REGION := us-east-1
HOSTED_ZONE_ID ?=
MANAGE_DNS ?= false
CREATE_OIDC ?= true

.PHONY: build serve infra outputs

## build: regenerate the page and LLM files, then run the production Hugo build
build:
	python3 site/build.py
	hugo --minify

## serve: local preview at http://localhost:1313
serve:
	python3 site/build.py
	hugo server

## infra: create or update the CloudFormation stack (needs HOSTED_ZONE_ID)
infra:
	@test -n "$(HOSTED_ZONE_ID)" || (echo "set HOSTED_ZONE_ID"; exit 1)
	aws cloudformation deploy --profile $(AWS_PROFILE) --region $(REGION) \
		--stack-name $(STACK) --template-file infra/site.yaml \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides HostedZoneId=$(HOSTED_ZONE_ID) ManageDns=$(MANAGE_DNS) \
			CreateGitHubOidcProvider=$(CREATE_OIDC)

## outputs: print stack outputs (bucket, distribution, role)
outputs:
	aws cloudformation describe-stacks --profile $(AWS_PROFILE) --region $(REGION) \
		--stack-name $(STACK) --query "Stacks[0].Outputs" --output table
