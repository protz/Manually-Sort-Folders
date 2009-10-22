all: dist upload

dist:
	rm -f tbsortfolders.xpi
	zip tbsortfolders.xpi --exclude Makefile --exclude TODO -r *

upload:
	echo "cd jonathan/files\nput tbsortfolders.xpi" | ftp xulforum@ftp.xulforum.org
