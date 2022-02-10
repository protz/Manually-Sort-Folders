.PHONY: dist

all: dist

dist:
	rm -f smsortfolders@xulforum.org.xpi
	zip smsortfolders@xulforum.org.xpi --exclude Makefile -r *
