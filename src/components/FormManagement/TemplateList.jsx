import React, { useEffect, useState } from "react";
import axios from "axios";


const TemplateList = () => {


    const [templates, setTemplates] = useState([]);



    const getTemplates = async()=>{


        try{


            const response = await axios.get(

                `${process.env.REACT_APP_FORM_MODULE_API_URL}/form-management/templates`,

                {
                    withCredentials:true
                }

            );


            setTemplates(response.data);


        }
        catch(error){

            console.log(
                "Template Fetch Error",
                error
            );

        }


    };



    useEffect(()=>{

        getTemplates();

    },[]);




    return (

        <div>

            <h2>
                Form Templates
            </h2>


            {
                templates.map((template)=>(

                    <div key={template.id}>

                        <h3>
                            {template.form_name}
                        </h3>


                        <p>
                            {template.form_type}
                        </p>


                    </div>

                ))
            }


        </div>

    );


};


export default TemplateList;