PROTOBUF_VERSION = 3.19.1
UNAME := $(shell uname)

PROTO_FILES := $(wildcard src/controllers/bff-proto/*.proto)
PBS_TS = $(PROTO_FILES:src/controllers/bff-proto/%.proto=src/controllers/bff-proto/%.ts)

WS_PBS_TS = src/controllers/proto/ws.ts

export PATH := node_modules/.bin:/usr/local/include/:protoc3/bin:$(PATH)

ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

ifeq ($(UNAME),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif

protoc3/bin/protoc:
	@# remove local folder
	rm -rf protoc3 || true

	@# Make sure you grab the latest version
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)

	@# Unzip
	unzip $(PROTOBUF_ZIP) -d protoc3
	@# delete the files
	rm $(PROTOBUF_ZIP)

	@# move protoc to /usr/local/bin/
	chmod +x protoc3/bin/protoc

install: protoc3/bin/protoc
	npm ci
	npm i -S google-protobuf@$(PROTOBUF_VERSION)
	npm i -S @types/google-protobuf@latest

test: build
	touch .env
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

src/controllers/bff-proto/%.ts: protoc3/bin/protoc src/controllers/bff-proto/%.proto
	protoc3/bin/protoc \
		--plugin=./node_modules/.bin/protoc-gen-ts_proto \
		--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
		--ts_proto_out="$(PWD)/src/controllers/bff-proto" \
		-I="$(PWD)/src/controllers/bff-proto" \
		"$(PWD)/src/controllers/bff-proto/$*.proto"

src/controllers/proto/ws.ts: protoc3/bin/protoc src/controllers/proto/ws.proto
	protoc3/bin/protoc \
		--plugin=./node_modules/.bin/protoc-gen-ts_proto \
		--ts_proto_opt=esModuleInterop=true,oneof=unions \
		--ts_proto_out="$(PWD)/src/controllers/proto" \
		-I="$(PWD)/src/controllers/proto" \
		"$(PWD)/src/controllers/proto/ws.proto"


build: ${PBS_TS} $(WS_PBS_TS)
	@rm -rf dist || true
	@mkdir -p dist
	@./node_modules/.bin/tsc -p tsconfig.json

lint:
	@node_modules/.bin/eslint . --ext .ts

lint-fix: ## Fix bad formatting on all .ts and .tsx files
	@node_modules/.bin/eslint . --ext .ts --fix

.PHONY: build test codegen lint lint-fix
