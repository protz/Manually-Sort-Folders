EXCLUDES = $(addprefix --exclude , '*/*~' '*/.*.sw*' '*/.vimsession' '*/*.template' 'Makefile' '*/*.xcf' '*/*.xpi' 'resources_past/*' TODO)

.PHONY: dist upload

all: dist

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi $(EXCLUDES) -r *

upload: dist
	scp tbsortfolders.xpi jonathan@protzenko.fr:~/Web/jonathan/manually-sort-folders/manually-sort-folders-$(DATE).xpi

DATE = $(shell date +%Y%m%d%H%M)
