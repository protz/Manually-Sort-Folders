EXCLUDES = $(addprefix --exclude , $(shell find . -iname '.*.sw*'))

.PHONY: dist upload

all: dist

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi $(EXCLUDES) --exclude Makefile --exclude TODO -r *

install:
	cp tbsortfolders.xpi ~/Documents/Thunderbird\ 78/extensions/tbsortfolders\@xulforum.org.xpi

upload: dist
	scp tbsortfolders.xpi jonathan@protzenko.fr:~/Web/jonathan/manually-sort-folders/manually-sort-folders-$(DATE).xpi

DATE = $(shell date +%Y%m%d%H%M)
