EXCLUDES = $(addprefix --exclude , $(shell find . -iname '.*.sw*') $(shell find . -iname '.vimsession'))

.PHONY: dist upload

all: dist

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi $(EXCLUDES) --exclude .vimsesion --exclude Makefile --exclude oldext --exclude tests --exclude TODO --exclude icon.xcf --exclude install.rdf.template -r *

upload: dist
	scp tbsortfolders.xpi jonathan@protzenko.fr:~/Web/jonathan/manually-sort-folders/manually-sort-folders-$(DATE).xpi

DATE = $(shell date +%Y%m%d%H%M)
