---
title: ZIO + Kubernetes
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, k8s]
---

## Premise

The example in this post is about using a kubernetes `CustomResourceDefinition` and `Operator` to simplify our lives as
someone who made need to run a lot of infrastructure set up (dare I even say Dev/Ops).

The example is complete/functioning, but isn't the most robust **solution** for what it does. It is meant to be
_enough_ to work, and illustrate the concept - but not exactly a model code base :angel:

## Hey, can you set me up a database?

Perhaps you're the one with the password/access, or the only person nearby on the team that "knows SQL", but it's part
of your daily life to set up databases for people. In between your coding work, you run _a lot_ of the following type of
code:

```postgresql
CREATE DATABASE stuff;
CREATE USER stuff PASSWORD 'abc123';
GRANT ALL ON DATABASE stuff TO stuff;
```

But, wait a minute - you've just picked up a nifty framework called `ZIO`, and have decided to automate a bit of you
daily todos.

## Enter ZIO

Let's create a `SQLService` that will set up a matching database and user:

```scala
trait SQLService {
  def createDatabaseWithRole(db: String): Task[String]
}

// We're going to be lazy, and not use a Logger
case class SQLServiceLive(cnsl: Console.Service) extends SQLService {
 override def createDatabaseWithRole(db: String): Task[String] = ???
}
```

We aren't running this so often that we need a dedicated connection pool, so let's just
grab a connection from the driver, and use this neat new ting we've learned about called `Zmanaged`.

```scala
private val acquireConnection =
    ZIO.effect {
      val url = {
        sys.env.getOrElse(
          "PG_CONN_URL", // If this environment variable isn't set...
          "jdbc:postgresql://localhost:5432/?user=postgres&password=password" // ... use this default one.
        )
      }
      DriverManager.getConnection(url)
    }

  private val managedConnection: ZManaged[Any, Throwable, Connection] =
    ZManaged.fromAutoCloseable(acquireConnection)
```

So what's a ZManaged?

> ZManaged is a data structure that encapsulates the acquisition and the release of a resource, 
> which may be used by invoking the use method of the resource. The resource will be automatically 
> acquired before the resource is used and automatically released after the resource is used.
- [The Docs](https://zio.dev/next/datatypes/resource/zmanaged/)

So a ZManged is like a `try/catch/finally` - but you don't have to set up a lot of boilerplate. Perhaps you have also
used a `thunk` to do something similar. The (very unsafely, with no error handling) example below handles the
acquisition and release of the connection + statement, and you just need to pass in a function that takes a connection,
and produces a result.

```scala
def sqlAction[T](thunk: Statement => T): T = {
  val url: String = "jdbc:postgresql://localhost:5432/?user=postgres&password=password"
  val connection = DriverManager.getConnection(url)
  val statement: Statement = connection.createStatement()
  val result: T = thunk(statement)
  statement.close()
  connection.close()
  result
}

def someSql = sqlAction { statement =>
  // do something with statement
  ???
}
```

We'll use a `ZManaged` for `Statement`s as well!

```scala
private def acquireStatement(conn: Connection): Task[Statement] =
    Task.effect {
      conn.createStatement
    }

  def managedStatement(conn: Connection): ZManaged[Any, Throwable, Statement] =
    ZManaged.fromAutoCloseable(acquireStatement(conn))
```

Now we'll write a function that takes a `Statement`, a `String` (some SQL), and will execute it:

```scala
  val executeSql: Statement => String => ZIO[Any, Throwable, Unit] =
    st =>
      sql =>
        ZIO
          .effect(st.execute(sql))
          .unit
          .tapBoth(
            err => cnsl.putStrLnErr(err.getMessage),
            _ => cnsl.putStrLn(sql)
          )
```

Now with all of our pieces in place, we can implement our `createDatabaseWithRole` that will _safely_ grab
a `Connection` +`Statement`, and run our SQL:

```scala
override def createDatabaseWithRole(db: String): Task[String] = {
    managedConnection.use { conn =>
      managedStatement(conn).use { st =>
        for {
          pw <- ZIO.effect(scala.util.Random.alphanumeric.take(6).mkString)
          _  <- executeSql(st)(s"CREATE DATABASE $db")
          _  <- executeSql(st)(s"CREATE USER $db PASSWORD '$pw'")
          _  <- executeSql(st)(s"GRANT ALL ON DATABASE $db TO $db")
        } yield pw
      }
    }
  }
```

Now we can just make a simple ZIO program to call our new service, and call it a day!

```scala
val simpleProgram: ZIO[Has[SQLService], Nothing, Unit] =
    SQLService(_.createDatabaseWithRole("altx11"))
      .unit
      .catchAll(_ => ZIO.unit)
```

## Automate the Automation

j/k you still have to stop what you're doing to run this for people.

```yaml
apiVersion: alterationx10.com/v1
kind: Database
metadata:
  name: databases
spec:
  databases:
    - dev
    - test
    - marks

```

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # name must match the spec fields below, and be in the form: <plural>.<group>
  name: databases.alterationx10.com
spec:
  # group name to use for REST API: /apis/<group>/<version>
  group: alterationx10.com
  # list of versions supported by this CustomResourceDefinition
  versions:
    - name: v1
      # Each version can be enabled/disabled by Served flag.
      served: true
      # One and only one version must be marked as the storage version.
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                databases:
                  type: array
                  items:
                    type: string
  # either Namespaced or Cluster
  scope: Namespaced
  names:
    # plural name to be used in the URL: /apis/<group>/<version>/<plural>
    plural: databases
    # singular name to be used as an alias on the CLI and for display
    singular: database
    # kind is normally the CamelCased singular type. Your resource manifests use this.
    kind: Database
    # shortNames allow shorter string to match your resource on the CLI
    shortNames:
      - db

```

```scala
  val eventProcessor: EventProcessor[Clock, Throwable, Database] =
    (ctx, event) =>
      event match {
        case Reseted() =>
          cnsl.putStrLn(s"Reseted - will (re) add any existing").ignore
        case Added(item) =>
          processItem(item)
        case Modified(item) =>
          processItem(item)
        case Deleted(item) =>
          cnsl.putStrLn(s"Deleted - but not performing action").ignore
      }
```

```scala
def processItem(item: Database): URIO[Clock, Unit] =
    (for {
      // Get all of our databases
      dbs <- ZIO.fromOption(item.spec.flatMap(_.databases).toOption)
      // For each database
      _ <- ZIO.foreach(dbs) { db =>
        (for {
          _ <- cnsl.putStrLn(s"Processing $db...")
          // Create things
          pw <- sqlService.createDatabaseWithRole(db)
          _  <- cnsl.putStrLn(s"... $db created ...")
          // Put the generated PW in a k8s secret
          _ <- upsertSecret(
            Secret(
              metadata = Some(
                ObjectMeta(
                  name = Option(db),
                  namespace = item.metadata
                    .map(_.namespace)
                    .getOrElse(Option("default"))
                )
              ),
              data = Map(
                "POSTGRES_PASSWORD" -> Chunk.fromArray(
                  pw.getBytes()
                )
              )
            )
          ).tapError(e => cnsl.putStrLnErr(s"Couldn't make secret:\n $e"))
          _ <- cnsl.putStrLn(s"... Secret created for $db")
        } yield ()).ignore
      }
    } yield ()).ignore
```

```scala
def upsertSecret(
      secret: Secret
  ): ZIO[Clock, K8sFailure, Secret] = {
    for {
      nm       <- secret.getName
      ns       <- secret.getMetadata.flatMap(_.getNamespace)
      existing <- secrets.get(nm, K8sNamespace(ns)).option
      sec <- existing match {
        case Some(_) => secrets.replace(nm, secret, K8sNamespace(ns))
        case None    => secrets.create(secret, K8sNamespace(ns))
      }
    } yield sec
  }
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres
          env:
            - name: POSTGRES_PASSWORD
              value: "password"
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
      protocol: TCP

```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: db-operator-service-account
automountServiceAccountToken: true
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: db-operator-cluster-role
rules:
  - apiGroups: [ "alterationx10.com" ]
    resources: [ "databases" ]
    verbs: [ "get", "watch", "list" ]
  - apiGroups: [ "" ]
    resources: [ "secrets" ]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: db-operator-cluster-role-binding
subjects:
  - kind: ServiceAccount
    name: db-operator-service-account
    namespace: default
roleRef:
  kind: ClusterRole
  name: db-operator-cluster-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db-operator
  labels:
    app: db-operator
spec:
  selector:
    matchLabels:
      app: db-operator
  template:
    metadata:
      labels:
        app: db-operator
    spec:
      serviceAccountName: db-operator-service-account
      containers:
        - name: db-operator
          image: smooth-operator:0.1.0-SNAPSHOT
          env:
            - name: PG_CONN_URL
              value: "jdbc:postgresql://postgres:5432/?user=postgres&password=password"
---
```
