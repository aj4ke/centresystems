#!/usr/bin/env python3
import json
import socket
import struct
import subprocess
import sys

TIMEOUT = 2

def varint(value):
    out = b""
    while True:
        byte = value & 0x7F
        value >>= 7
        out += bytes([byte | (0x80 if value else 0)])
        if not value:
            return out

def recv_exact(sock, size):
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("connection closed")
        data += chunk
    return data

def recv_varint(sock):
    value = 0
    for shift in range(0, 35, 7):
        byte = recv_exact(sock, 1)[0]
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value
    raise ValueError("varint too long")

def minecraft(host, port):
    address = host.encode()
    handshake = varint(0) + varint(0) + varint(len(address)) + address + struct.pack(">H", port) + varint(1)
    with socket.create_connection((host, port), timeout=TIMEOUT) as sock:
        sock.sendall(varint(len(handshake)) + handshake + varint(1) + varint(0))
        recv_varint(sock)
        recv_varint(sock)
        status = json.loads(recv_exact(sock, recv_varint(sock)))
    return status["players"]["online"]

def source(host, port):
    query = b"\xff\xff\xff\xffTSource Engine Query\x00"
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(TIMEOUT)
        sock.sendto(query, (host, port))
        data = sock.recv(1400)
        if data[4:5] == b"A":
            sock.sendto(query + data[5:9], (host, port))
            data = sock.recv(1400)
    if data[4:5] != b"I":
        raise ValueError("unexpected A2S_INFO response")
    offset = 6
    for _ in range(4):
        offset = data.index(b"\x00", offset) + 1
    return data[offset + 2] - data[offset + 4]

def conntrack(port):
    result = subprocess.run(
        ["sudo", "-n", "/usr/sbin/conntrack", "-L", "-p", "tcp", "--dport", str(port), "--state", "ESTABLISHED"],
        capture_output=True, text=True, timeout=TIMEOUT, check=True,
    )
    return len(result.stdout.splitlines())

def main():
    kind, *args = sys.argv[1:]
    if kind == "minecraft":
        print(minecraft(args[0], int(args[1])))
    elif kind == "source":
        print(source(args[0], int(args[1])))
    elif kind == "conntrack":
        print(conntrack(int(args[0])))
    else:
        sys.exit(f"unknown server type: {kind}")

main()