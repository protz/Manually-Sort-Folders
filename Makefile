all: debug_template package

release: release_template package

package: dist upload

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi --exclude Makefile --exclude TODO --exclude install.rdf.template -r *

upload:
	echo "cd jonathan/files\nput tbsortfolders.xpi" | ftp xulforum@ftp.xulforum.org

debug_template:
	cp -f install.rdf.template install.rdf
	sed -i s/__REPLACEME__/pre\.$(shell date +%y%m%d)/ install.rdf

release_template:
	cp -f install.rdf.template install.rdf
	sed -i s/__REPLACEME__// install.rdf
