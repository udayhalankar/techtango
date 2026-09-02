import api from
  "../../../../services/api";


export const ENTERPRISE_EXPERIENCE_BUILDER_TYPE =
  "enterpriseexperiencebuilder";


/* ============================================================================
   LIST
============================================================================ */

export async function listEnterpriseExperiences() {

  const response =
    await api.get(
      "/dashboardbuilder",
      {
        params: {
          builderType:
            ENTERPRISE_EXPERIENCE_BUILDER_TYPE,
        },
      }
    );


  return Array.isArray(
    response?.data
  )
    ? response.data
    : [];
}


/* ============================================================================
   GET
============================================================================ */

export async function getEnterpriseExperience(
  id
) {

  if (!id) {

    throw new Error(
      "Enterprise Experience id is required"
    );
  }


  const response =
    await api.get(
      `/dashboardbuilder/${id}`,
      {
        params: {
          builderType:
            ENTERPRISE_EXPERIENCE_BUILDER_TYPE,
        },
      }
    );


  return response?.data;
}


/* ============================================================================
   CREATE
============================================================================ */

export async function createEnterpriseExperience(
  experience
) {

  const response =
    await api.post(
      "/dashboardbuilder",
      {
        pageName:
          String(
            experience
              ?.name ||
            ""
          ).trim() ||
          "New Enterprise Experience",

        description:
          String(
            experience
              ?.description ||
            ""
          ).trim() ||
          null,

        dbtableId:
          [],

        status:
          "Active",

        builderType:
          ENTERPRISE_EXPERIENCE_BUILDER_TYPE,

        layout:
          experience,
      }
    );


  return response?.data;
}


/* ============================================================================
   UPDATE
============================================================================ */

export async function saveEnterpriseExperience(
  id,
  experience
) {

  if (!id) {

    throw new Error(
      "Enterprise Experience id is required"
    );
  }


  const response =
    await api.put(
      `/dashboardbuilder/${id}`,
      {
        pageName:
          String(
            experience
              ?.name ||
            ""
          ).trim() ||
          "Enterprise Experience",

        description:
          String(
            experience
              ?.description ||
            ""
          ).trim() ||
          null,

        status:
          "Active",

        builderType:
          ENTERPRISE_EXPERIENCE_BUILDER_TYPE,

        layout:
          experience,
      }
    );


  return response?.data;
}


/* ============================================================================
   DELETE
============================================================================ */

export async function deleteEnterpriseExperience(
  id
) {

  if (!id) {

    throw new Error(
      "Enterprise Experience id is required"
    );
  }


  const response =
    await api.delete(
      `/dashboardbuilder/${id}`
    );


  return response?.data;
}