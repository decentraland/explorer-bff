ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	npm ci

test: build
	touch .env
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

build:
	@rm -rf dist || true
	@mkdir -p dist
	@./node_modules/.bin/tsc -p tsconfig.json

start: build
	npm start

start-org: build
	DOT_ENV=.env.org npm start

start-zone: build
	DOT_ENV=.env.zone npm start

start-fixed: build
	DOT_ENV=.env.fixed npm start

lint:
	@node_modules/.bin/eslint . --ext .ts

lint-fix: ## Fix bad formatting on all .ts and .tsx files
	@node_modules/.bin/eslint . --ext .ts --fix

.PHONY: build test codegen lint lint-fix
