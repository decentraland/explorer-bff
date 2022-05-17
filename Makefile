PROTOBUF_VERSION = 3.19.1
PROTOC ?= protoc
UNAME := $(shell uname)
export PATH := node_modules/.bin:/usr/local/include/:protoc3/bin:$(PATH)

ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

ifeq ($(UNAME),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif

install_compiler:
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

install: install_compiler
	npm ci
	npm i -S google-protobuf@$(PROTOBUF_VERSION)
	npm i -S @types/google-protobuf@latest

test: build
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

rpc:
	${PROTOC} \
		--plugin=./node_modules/.bin/protoc-gen-ts_proto \
		--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
		--ts_proto_out="$(PWD)/src/controllers/bff-proto" \
		-I="$(PWD)/src/controllers/bff-proto" \
		"$(PWD)/src/controllers/bff-proto/comms-service.proto"
	${PROTOC} \
		--plugin=./node_modules/.bin/protoc-gen-ts_proto \
		--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
		--ts_proto_out="$(PWD)/src/controllers/bff-proto" \
		-I="$(PWD)/src/controllers/bff-proto" \
		"$(PWD)/src/controllers/bff-proto/authentication-service.proto"

build:
	@rm -rf dist || true
	@mkdir -p dist
	@$(MAKE) rpc
	@./node_modules/.bin/tsc -p tsconfig.json

lint:
	@node_modules/.bin/eslint . --ext .ts

lint-fix: ## Fix bad formatting on all .ts and .tsx files
	@node_modules/.bin/eslint . --ext .ts --fix

.PHONY: build test codegen lint lint-fix
