.PHONY: deps check apply router proxmox vms bootstrap lint

deps:
	ansible-galaxy collection install -r requirements.yml

check:
	ansible-playbook playbooks/site.yml --check --diff $(ARGS)

apply:
	ansible-playbook playbooks/site.yml --diff $(ARGS)

router:
	ansible-playbook playbooks/router.yml --diff $(ARGS)

proxmox:
	ansible-playbook playbooks/proxmox.yml --diff $(ARGS)

vms:
	ansible-playbook playbooks/vms.yml --diff $(ARGS)

bootstrap:
	ansible-playbook playbooks/vms.yml --diff --limit $(VM) -e ansible_user=$(AS) \
		-e ansible_ssh_private_key_file=~/.ssh/id_ed25519 -e ansible_become_method=su --ask-become-pass

lint:
	ansible-lint
