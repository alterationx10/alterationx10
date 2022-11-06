---
title: "Kubernetes and You"
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Kubernetes, k8s, k3s, Pi-hole, neo4j]
---

Wut Do'n

- Set up Pi-hole to reduce ads on our home network, and make DNS records that
  point to our internal services.
- Use Cert Manager + a DNS Service to automate generation of trusted SSL
  certificate.
- Use Traefik to route traffic web/browser traffic over https to out services
  via sub-domains.
- Use k3s/helm to open extra ports on the load balancer.
- Use Traefik to route multiple ports to the same sub-domain.
- Use the Helm Operator

What we're not covering so much:

- Registering / managing a domain
- How to set up a static IP
- How to change DNS servers on your home network
- Configuring Pi-hole beyond the defaults

## Pre-reqs

## k3s

`k3s` is a lightweight kubernetes distribution that especially targets systems
that are "low-overhead" (edge servers, ARM, IoT, home labs, etc...), and strips
out some extra items that won't likely be used in those cases. It also comes set
up with some "battery included features such as:

- local storage provider
- service load balancer
- Helm controller
- Traefik ingress controller.

Check out the [official site](https://k3s.io/) for directions on how to install
it.

:::caution sudo kubectl

When you first get set up, you might see something like this when running
`kubectl`:

```shell
➜  ~ kubectl get nodes
error: error loading config file "/etc/rancher/k3s/k3s.yaml": open /etc/rancher/k3s/k3s.yaml: permission denied
```

You will either need to `sudo kubectl ...`, or copy that file you your users
`~/kube/config` to have proper access to it without using `sudo`. It's not
recommended to change the permissions of that file directly, but hey, it's your
stuff!

:::

:::tip $KUBECONFIG

Many wonderful tools also rely on the kubernetes config, such as `helm`, so it
can be useful to add a _generally respected_ variable to your users `env`:

```shell
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

If you plan to keep using `sudo kubectl...`, you can add this to your sudo
config to the environment variable is preserved:

```
Defaults env_keep += "KUBECONFIG"
```

If you don't add that line, tools like helm (i.e. `sudo helm list`) won't see
the `$KUBECONFIG` environment variable as root from your regular users
environment.

:::

## Cert Manager

:::danger You Are Here

At this point, it's assumed that you have kubernetes installed on your
single-node server, it has a static IP, and you can `ssh` into it!

You should also be able to interact with kubernetes successfully via the
`kubectl` command.

Now let's install some stuff!

:::

`Cert Manager` adds certificates and certificate issuers as resource types in
Kubernetes clusters, and simplifies the process of obtaining, renewing and using
those certificates. The default static install should be good for our purposes:

```shell
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.10.0/cert-manager.yaml
```

You can check the official installation instructions
[here](https://cert-manager.io/docs/installation/) for more details.

Once installed, we can then add a `ClusterIssuer` that will issue certificates from Let's Encrypt, and use a DNS challenge to solve it. The DNS challenge will be key in our home-lab set up, as we don't have a public `http://` site for a webhook challenge.

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: lets-encrypt-staging
spec:
  acme:
    email: your@email.here
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: lets-encrypt-staging-account-key
    solvers:
      - dns01:
          digitalocean:
            tokenSecretRef:
              name: digitalocean-dns
              key: access-token
```

:::tip ClusterIssuer vs Issuer

An `Issuer` lives in a namespace, and will only monitor `Certificate` resources
in that namespace. A `ClusterIssuer` as a system-wide issuer, and can/will
monitor `Certificate` resources in all namespaces.

:::

cert goodness

## Traefik LoadBalancer

```yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    dashboard:
       enabled: true
       ingressRoute: true
    ports:
       traefik:
         expose: true
       bolt:
         port: 7687
         protocol: TCP
         expose: true
         exposedPort: 7687
```

## PiHole

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pihole
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pihole-etc
spec:
  storageClassName: local-path
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pihole-dnsmasq
spec:
  storageClassName: local-path
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 500Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pihole
  namespace: pihole
  labels:
    app: pihole
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pihole
  template:
    metadata:
      labels:
        app: pihole
        name: pihole
    spec:
      containers:
        - name: pihole
          image: pihole/pihole:latest
          imagePullPolicy: Always
          env:
            - name: TZ
              value: "America/New_York"
            - name: WEBPASSWORD
              value: "your_password_here"
          volumeMounts:
            - name: pihole-etc
              mountPath: "/etc/pihole"
            - name: pihole-dnsmasq
              mountPath: "/etc/dnsmasq.d"
      volumes:
        - name: pihole-etc
          persistentVolumeClaim:
            claimName: pihole-etc
        - name: pihole-dnsmasq
          persistentVolumeClaim:
            claimName: pihole-dnsmasq
---
apiVersion: v1
kind: Service
metadata:
  name: pihole-admin
  namespace: pihole
spec:
  selector:
    app: pihole
  ports:
    - port: 80
      targetPort: 80
      name: pihole-admin
---
apiVersion: v1
kind: Service
metadata:
  name: pihole
  namespace: pihole
spec:
  selector:
    app: pihole
  ports:
    - port: 53
      targetPort: 53
      protocol: TCP
      name: dns-tcp
    - port: 53
      targetPort: 53
      protocol: UDP
      name: dns-udp
  externalIPs:
    - 192.168.1.123
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: pihole-admin
  namespace: pihole
spec:
  entryPoints:
    - websecure
  routes:
    - kind: Rule
      match: Host(`pihole.turdwaffle.com`)
      services:
        - name: pihole-admin
          port: 80
  tls:
    secretName: pihole-tls
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: pihole-cert
  namespace: pihole
spec:
  secretName: pihole-tls
  dnsNames:
    - pihole.turdwaffle.com
  issuerRef:
    name: lets-encrypt
    kind: ClusterIssuer
```

## Neo4J

```yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: neo4j
  namespace: kube-system
spec:
  repo: https://helm.neo4j.com/neo4j
  chart: neo4j-standalone
  targetNamespace: neo4j
  valuesContent: |-
    neo4j:
      name: "you_database_name"
      password: "your_database_password"
      edition: "community"
      acceptLicenseAgreement: "yes"
      # set resources for the Neo4j Container. The values set will be used for both "requests" and "limit".
      resources:
        cpu: "1000m"
        memory: "2Gi"

    # Volumes for Neo4j
    volumes:
      data:
        # REQUIRED: specify a volume mode to use for data
        # Valid values are share|selector|defaultStorageClass|volume|volumeClaimTemplate|dynamic
        # To get up-and-running quickly, for development or testing, use "defaultStorageClass" for a dynamically provisioned volume of the default storage class.
        mode: "defaultStorageClass"
        # Only used if mode is set to "defaultStorageClass"
        # Dynamic provisioning using the default storageClass
        defaultStorageClass:
          accessModes:
            - ReadWriteOnce
          requests:
            storage: 10Gi

    # Services for Neo4j
    services:
      # A ClusterIP service with the same name as the Helm Release name should be used for Neo4j Driver connections originating inside the
      # Kubernetes cluster.
      default:
        # Annotations for the K8s Service object
        annotations: { }

      # A LoadBalancer Service for external Neo4j driver applications and Neo4j Browser
      neo4j:
        enabled: false
```

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: neo4j-web
  namespace: neo4j
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - kind: Rule
      match: Host(`neo4j.turdwaffle.com`)
      services:
        - name: neo4j
          port: 7474
  tls:
    secretName: neo4j-tls
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: neo4j-bolt
  namespace: neo4j
spec:
  entryPoints:
    - bolt
  routes:
    - kind: Rule
      match: Host(`neo4j.turdwaffle.com`)
      services:
        - name: neo4j
          port: 7687
  tls:
    secretName: neo4j-tls
```

## Wrapping up
