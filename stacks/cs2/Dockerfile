FROM ghcr.io/kus/cs2-modded-server:latest@sha256:31d09c4719c6b7deb345a872a9ac968611730a820d9489610f45e0d6cd5de8cd
USER root
RUN apt-get update && apt-get install -y --no-install-recommends libicu-dev \
    && rm -rf /var/lib/apt/lists/*
