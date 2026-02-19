FROM --platform=linux/amd64 eclipse-temurin:25
RUN apt-get update && apt-get install -y curl unzip
WORKDIR /opt
ENV BLARG_VERSION="0.0.6"
RUN curl -fLO https://github.com/wishingtreedev/blarg/releases/download/v${BLARG_VERSION}/blarg-linux-x64-v${BLARG_VERSION}.zip && unzip -o blarg-linux-x64-v${BLARG_VERSION}.zip  && chmod +x blarg
RUN ./blarg help
COPY site site
RUN ./blarg build
EXPOSE 9000

CMD ["./blarg", "serve", "--no-tty", "--host", "0.0.0.0"]