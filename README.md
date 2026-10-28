# centresystems

Infrastructure as code for my homelab.

## Network

- OpenWrt router on an x86 mini PC
- Segmented VLANs for management, services, public servers and a lab network
- Firewall zones per VLAN, with port forwards for the public servers
- Tailscale for remote access
- Internal DNS for every host under `centresystems.internal`

## Compute

- Three-node Proxmox VE 9 cluster
- ZFS storage on each node

## Virtual machines

| VM | Runs |
|---|---|
| website | centresystems.info: Caddy and a Node API, published through a Cloudflare Tunnel and deployed by GitHub Actions |
| zabbix | Zabbix monitoring server with PostgreSQL and nginx |
| ark | ARK: Survival Ascended server in Docker |
| cs2 | Counter-Strike 2 surf server in Docker |
| terraria | Terraria tModLoader server in Docker |

## Managed by this repo

- Router: interfaces, VLANs, firewall, DHCP, DNS, SSH, packages
- Proxmox: node networking, repositories and packages, cluster storage, VM hardware
- VMs: hostname, network, DNS, accounts, SSH, automatic security updates, monitoring agent
- Applications: game servers, Zabbix server, Cloudflare Tunnel
