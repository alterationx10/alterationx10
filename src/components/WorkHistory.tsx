import * as React from "react";

interface WorkHistoryProps {
    logo: string,
    title: string,
    subTitle: string,
}

export default (props) => {

    return (
        <div className={'work-history'}>
            <div className={'logo'}>
                <img src={props.logo} width={200} alt={props.logoAlt} style={{
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto"
                }}/>
            </div>
            <div className={'blurb'}>
                <h3>{props.title}</h3>
                <h5>{props.subTitle}</h5>
                {props.children}
            </div>
        </div>
    )
}
