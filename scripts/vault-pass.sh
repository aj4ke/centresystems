#!/bin/sh
exec security find-generic-password -a "$USER" -s centresystems-ansible-vault -w
