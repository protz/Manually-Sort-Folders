EXCLUDES = $(addprefix --exclude , $(shell find . -iname '.*.sw*'))

all: debug_template package

release: release_template package

package: dist upload

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi $(EXCLUDES) --exclude Makefile --exclude oldext --exclude tests --exclude TODO --exclude icon.xcf --exclude install.rdf.template -r *

upload:
	echo "cd jonathan/files\nput tbsortfolders.xpi\nput TODO TODO_tbsortfolders\nput Changelog Changelog_tbsortfolders" | ftp xulforum@ftp.xulforum.org

debug_template:
	cp -f install.rdf.template install.rdf
	sed -i s/__REPLACEME__/\.$(shell date +%y%m%d)pre/ install.rdf

release_template:
	cp -f install.rdf.template install.rdf
	sed -i s/__REPLACEME__// install.rdf
