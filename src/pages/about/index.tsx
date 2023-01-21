import * as React from "react";
// @ts-ignore
import Layout from "@theme/Layout";
import WorkHistory from "../../components/WorkHistory";

export default () => {
  return (
    <Layout>
      <div className={"rambling"}>
        <p>Hello there! 👋</p>

        <p>I'm Mark, and I'm a Scala nerd.</p>

        <p>
          This site is my tech blog, largely about and related to all things
          Scala. I use ZIO at work, so you'll likely find a healthy dose of that
          here as well.
        </p>

        <p>
          Given the opportunity, I will likely talk to you about kubernetes too
          👼
        </p>
        <h3>Work History</h3>
        <p>
          If you're interested in a sort of running Curriculum Vitae, then read
          on to learn a little more about me, as well as my current and past
          misadventures! If you're looking for something more official looking,
          you can get the most recent copy of hand-crafted LaTeX resume{" "}
          <a href="/resume/mark-rudolph-resume.pdf">here</a>.
        </p>
        <WorkHistory
          logo={"/img/about/carvana.png"}
          title={"Carvana"}
          subTitle={"Principal Engineer | Special Projects :: 2020-Present"}
          logoAlt={"Carvana Logo"}
        >
          Carvana is an online car retailer. There, in the Special Projects
          department, I build out backends in Scala.
        </WorkHistory>
        <WorkHistory
          logo={"/img/about/kt.png"}
          title={"Kangarootime"}
          subTitle={"Senior Software Engineer :: 2019-2020"}
          logoAlt={"Kangarootime Logo"}
        >
          Kangarootime creates leading software for childcare centers and
          preschools. In my time there, I helped lift, develop, and deploy a new
          product platform to Kubernetes.
        </WorkHistory>
        <WorkHistory
          logo={"/img/about/els.png"}
          title={"Evil Lair Studios"}
          subTitle={"Chief Super Villain :: 2016-2020"}
          logoAlt={"Evil Lair Studios Logo"}
        >
          <p>
            I owned and operated Evil Lair Studios, LLC - a side project in the
            'Maker' spirit. I design/build things with my trusty CO2 Laser
            Cutter, CNC Milling Machine, and 3D Printer. (Shut down in 2020)
          </p>

          <p>
            I had originally started the company to self publish some game
            titles with based around super villains, hence the fun name. I
            decided to keep the theme, because what super villain doesn't love
            elaborate contraptions?! 😜
          </p>
        </WorkHistory>
        <WorkHistory
          logo={"/img/about/bod.png"}
          title={"Blue Orange Digital"}
          subTitle={"Senior Scala Engineer :: 2018-2019 (6 Mo)"}
          logoAlt={"Blue Orange Digital Logo"}
        >
          <p>
            Blue Orange Digital is a an integrated full-stack data science
            agency. In my time there, I helped shore up the infrastructure of a
            multi-billion dollar hedge fund based in Stamford, Connecticut. I
            worked to troubleshoot, improve, and document their containerized
            Scala/Akka micro service platform backed by Kafka/MongoDB/MS
            SQLServer.
          </p>
        </WorkHistory>
        <WorkHistory
          logo={"/img/about/vaspian.png"}
          title={"Vaspian"}
          subTitle={"Full Stack Developer :: 2014-2018"}
          logoAlt={"Vaspian Logo"}
        >
          <p>
            Vaspian is a cloud-based VoIP provider located in Buffalo, NY. In my
            time there, I focused on building and automating platforms that
            provide advanced analytics and interfaces to our customers, as well
            as enhanced operational tools for internal service provisioning.
          </p>
          <p>Some of the larger projects I lead while working there include:</p>
          <h4>In-House Kubernetes</h4>
          <p>
            Designed, built, and maintain our own bare-metal Kubernetes cluster
            for application deployment. Building this all-in-one system allowed
            us to more reliably deliver our current applications/services to our
            customers, promptly roll out new features, as well as offer new
            services that were intractable to manage before.
          </p>
          <h4>Customer Facing Applications</h4>
          <p>
            Built and maintain our main customer facing portal, which provides
            custom reporting and real-time event integration with our core phone
            system. Using Scala and Akka, along with the Play Framework, we have
            been able to roll out stable, scalable services that are agile
            enough to grow with our customers.
          </p>
          <h4>Internal Tooling</h4>
          <p>
            Built and maintain middleware for maintenance/administration of
            systems built by our internal Network Engineers which allows our
            customer service/support staff to perform more technical tasks such
            as:
            <ul>
              <li>Dynamically provision custom services for our customers</li>
              <li>Manage and troubleshoot customer configurations</li>
              <li>Monitor customer service status in real time</li>
            </ul>
          </p>
        </WorkHistory>
        <WorkHistory
          logo={"/img/about/sensorcon.png"}
          title={"Sensorcon"}
          subTitle={"Scientist/Software Developer :: 2011-2014"}
          logoAlt={"Sensorcon Logo"}
        >
          <p>
            Sensorcon is a developer and manufacturer of environmental sensors
            located in Williamsville, NY. In my time there, I was part of a
            small start-up team focusing on bringing products to market from the
            ground up. My primary focus was working with firmware engineers to
            write libraries and customer facing applications (iOS, Android, PC)
            that could talk to our sensor devices via Bluetooth.
          </p>
          <p>
            Relevant software projects include:
            <ul>
              <li>
                iOS/Android/Java API library development to integrate with our
                sensors
              </li>
              <li>iOS/Android App development</li>
              <li>
                Internal inventory system to improve our manufacturing capacity
              </li>
              <li>
                Automated QA testing protocols and procedures for sensor
                development, to enable technicians to batch process sensors in a
                reliable and repeatable manner
              </li>
              <li>
                Automated QC testing procedures for production, to promptly
                identify issues before they reached consumers
              </li>
            </ul>
          </p>
          <p>
            You can also check out the (archived){" "}
            <a href="https://www.kickstarter.com/projects/453951341/sensordrone-the-6th-sense-of-your-smartphoneand-be">
              KickStarter
            </a>{" "}
            campaign we ran!
          </p>
        </WorkHistory>
        <WorkHistory
          logo={"/img/about/ub.png"}
          title={"University at Buffalo"}
          subTitle={"PhD Theoretical Chemistry :: 2006-2012"}
          logoAlt={"University at Buffalo Logo"}
        >
          <p>
            I received my PhD at the State University of New York at Buffalo in
            Computational Chemistry under{" "}
            <a href="https://ja01.chem.buffalo.edu/">Dr. Jochen Autschbach</a>,
            focusing on optical activity of transition metal complexes.
          </p>
          <p>
            I managed to put out a couple papers during my time there. You can
            check out my{" "}
            <a href="https://scholar.google.com/citations?user=Xu1j0IMAAAAJ">
              Google Scholar
            </a>{" "}
            if you want to see some of the topics I've written about.
          </p>
        </WorkHistory>
      </div>
    </Layout>
  );
};
