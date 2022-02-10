.PHONY: dist

all: dist

dist:
	rm -f tbsortfolders@xulforum.org.xpi
	zip tbsortfolders@xulforum.org.xpi --exclude Makefile -r *
