# centresystems

Infrastructure as code for my homelab.

## Overview

- OpenWrt router on an x86 mini PC
- VLANs for management, services, public servers and a lab network
- Firewall zones per VLAN, with port forwards for the public servers
- Tailscale for remote access
- Internal DNS for every host under `centresystems.internal`
- Three-node Proxmox VE 9 cluster
- ZFS storage