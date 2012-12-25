EXCLUDES = $(addprefix --exclude , $(shell find . -iname '.*.sw*'))

all: dist

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi $(EXCLUDES) --exclude Makefile --exclude oldext --exclude tests --exclude TODO --exclude icon.xcf --exclude install.rdf.template -r *

upload:
	echo "cd jonathan/files\nput tbsortfolders.xpi\nput TODO TODO_tbsortfolders\nput Changelog Changelog_tbsortfolders" | ftp xulforum@ftp.xulforum.org

DATE = $(shell date +%Y%m%d%H%M)
