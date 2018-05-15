all: setup lint cover docs

setup:
	npm install

lint:
	npm run lint

test:
	npm test
.PHONY: test

cover:
	npm run cover

docs:
	npm run docs
.PHONY: docs

clean:
	npm run clean
