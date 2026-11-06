FROM jacobsmile/tmodloader1.4:latest@sha256:5f566a7362e1770b6ec34c8028a9933406c7618ea0722dd6e030a83491c2d962
ARG TMOD_VERSION=v2026.09.3.1
ARG TMOD_SHA256=5aaed81b245044286c3ade200f8bac9162ef932ee8ff11a31e05da49a186c07b
RUN apt-get update && apt-get install -y libicu-dev && rm -rf /var/lib/apt/lists/*
RUN wget -q "https://github.com/tModLoader/tModLoader/releases/download/${TMOD_VERSION}/tModLoader.zip" \
    && echo "${TMOD_SHA256}  tModLoader.zip" | sha256sum -c - \
    && unzip -oq tModLoader.zip \
    && rm tModLoader.zip \
    && chmod 755 LaunchUtils/ScriptCaller.sh start-tModLoaderServer.sh
