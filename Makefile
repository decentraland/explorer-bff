ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	yarn install --frozen-lockfile

test: build
	touch .env
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

build: 
	@rm -rf dist || true
	@mkdir -p dist
	@yarn build

start: build
	yarn start

start-org: build
	DOT_ENV=.env.org yarn start

start-zone: build
	DOT_ENV=.env.zone yarn start

start-fixed: build
	DOT_ENV=.env.fixed yarn start

lint:
	@node_modules/.bin/eslint . --ext .ts

lint-fix: ## Fix bad formatting on all .ts and .tsx files
	@node_modules/.bin/eslint . --ext .ts --fix

.PHONY: build test codegen lint lint-fix
