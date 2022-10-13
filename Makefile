ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

PROTO_DEPS := node_modules/@dcl/protocol/public/bff-services.proto package.json
PROTO_FILE := src/protocol/bff-services.ts

install:
	npm ci

test: build
	touch .env
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

${PROTO_FILE}: ${PROTO_DEPS}
	mkdir -p "$(PWD)/src/protocol" || true
	node_modules/.bin/protoc \
		--plugin=./node_modules/.bin/protoc-gen-ts_proto \
		--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
		--ts_proto_out="$(PWD)/src/protocol" \
		-I="$(PWD)/node_modules/protobufjs" \
		-I="$(PWD)/node_modules/@dcl/protocol/proto" \
		-I="$(PWD)/node_modules/@dcl/protocol/public" \
		"$(PWD)/node_modules/@dcl/protocol/public/bff-services.proto"

build: ${PROTO_FILE}
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
